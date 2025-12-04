<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:param name="sortField" select="'title'"/>
  <xsl:param name="sortType" select="'text'"/>
  <xsl:param name="order" select="'asc'"/>

  <xsl:template match="/">
    <table class="table">
      <thead>
        <tr>
          <th>书号</th>
          <th>书名</th>
          <th>作者</th>
          <th>分类</th>
          <th>价格</th>
          <th>年份</th>
          <th>库存</th>
        </tr>
      </thead>
      <tbody>
        <xsl:apply-templates select="library/book">
          <xsl:sort select="*[name()=$sortField]" data-type="{$sortType}" order="{$order}"/>
        </xsl:apply-templates>
      </tbody>
    </table>
  </xsl:template>

  <xsl:template match="book">
    <tr>
      <td><xsl:value-of select="@id"/></td>
      <td><xsl:value-of select="title"/></td>
      <td><xsl:value-of select="author"/></td>
      <td><xsl:value-of select="category"/></td>
      <td><xsl:value-of select="price"/></td>
      <td><xsl:value-of select="publishYear"/></td>
      <td><xsl:value-of select="stock"/></td>
    </tr>
  </xsl:template>
</xsl:stylesheet>
